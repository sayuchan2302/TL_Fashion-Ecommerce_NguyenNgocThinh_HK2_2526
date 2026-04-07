DO $$
DECLARE
    v_cutoff TIMESTAMP := NOW();
BEGIN
    IF to_regclass('flyway_schema_history') IS NOT NULL THEN
        SELECT fsh.installed_on
        INTO v_cutoff
        FROM flyway_schema_history fsh
        WHERE fsh.script = 'V20260407_01__add_order_discount_usage_consumed_flag.sql'
          AND fsh.success = TRUE
        ORDER BY fsh.installed_rank DESC
        LIMIT 1;
    END IF;

    IF v_cutoff IS NULL THEN
        v_cutoff := NOW();
    END IF;

    -- Reconcile voucher used_count for legacy root discounted orders that were already consumed=true post-deploy.
    WITH legacy_root AS (
        SELECT o.id,
               UPPER(BTRIM(o.coupon_code)) AS code_norm,
               o.store_id,
               COALESCE(o.discount_usage_consumed, FALSE) AS consumed
        FROM orders o
        WHERE o.parent_order_id IS NULL
          AND COALESCE(o.discount, 0) > 0
          AND COALESCE(BTRIM(o.coupon_code), '') <> ''
          AND o.created_at < v_cutoff
    ),
    voucher_candidates AS (
        SELECT l.id AS order_id,
               v.id AS voucher_id
        FROM legacy_root l
        JOIN vouchers v
          ON UPPER(v.code) = l.code_norm
        WHERE (l.store_id IS NOT NULL AND v.store_id = l.store_id)
           OR (
                l.store_id IS NULL
                AND EXISTS (
                    SELECT 1
                    FROM orders so
                    WHERE so.parent_order_id = l.id
                      AND so.store_id = v.store_id
                )
           )
    ),
    voucher_match_stats AS (
        SELECT vc.order_id,
               COUNT(*) AS match_count,
               MIN(vc.voucher_id::TEXT) AS single_voucher_id_text
        FROM voucher_candidates vc
        GROUP BY vc.order_id
    ),
    voucher_decrements AS (
        SELECT (vms.single_voucher_id_text)::UUID AS voucher_id,
               COUNT(*)::INT AS decrement_count
        FROM voucher_match_stats vms
        JOIN legacy_root l ON l.id = vms.order_id
        WHERE l.consumed = TRUE
          AND vms.match_count = 1
        GROUP BY vms.single_voucher_id_text
    )
    UPDATE vouchers v
    SET used_count = GREATEST(0, COALESCE(v.used_count, 0) - vd.decrement_count)
    FROM voucher_decrements vd
    WHERE v.id = vd.voucher_id;

    -- Reconcile coupon used_count for deterministic non-voucher legacy matches only.
    WITH legacy_root AS (
        SELECT o.id,
               UPPER(BTRIM(o.coupon_code)) AS code_norm,
               o.store_id,
               COALESCE(o.discount_usage_consumed, FALSE) AS consumed
        FROM orders o
        WHERE o.parent_order_id IS NULL
          AND COALESCE(o.discount, 0) > 0
          AND COALESCE(BTRIM(o.coupon_code), '') <> ''
          AND o.created_at < v_cutoff
    ),
    voucher_candidates AS (
        SELECT l.id AS order_id,
               v.id AS voucher_id
        FROM legacy_root l
        JOIN vouchers v
          ON UPPER(v.code) = l.code_norm
        WHERE (l.store_id IS NOT NULL AND v.store_id = l.store_id)
           OR (
                l.store_id IS NULL
                AND EXISTS (
                    SELECT 1
                    FROM orders so
                    WHERE so.parent_order_id = l.id
                      AND so.store_id = v.store_id
                )
           )
    ),
    voucher_match_stats AS (
        SELECT vc.order_id,
               COUNT(*) AS match_count
        FROM voucher_candidates vc
        GROUP BY vc.order_id
    ),
    coupon_decrements AS (
        SELECT c.id AS coupon_id,
               COUNT(*)::INT AS decrement_count
        FROM legacy_root l
        LEFT JOIN voucher_match_stats vms ON vms.order_id = l.id
        JOIN coupons c ON UPPER(c.code) = l.code_norm
        WHERE l.consumed = TRUE
          AND COALESCE(vms.match_count, 0) = 0
        GROUP BY c.id
    )
    UPDATE coupons c
    SET used_count = GREATEST(0, COALESCE(c.used_count, 0) - cd.decrement_count)
    FROM coupon_decrements cd
    WHERE c.id = cd.coupon_id;

    -- Backfill legacy root discounted orders so they are never consumed again.
    UPDATE orders o
    SET discount_usage_consumed = TRUE
    WHERE o.parent_order_id IS NULL
      AND COALESCE(o.discount, 0) > 0
      AND COALESCE(BTRIM(o.coupon_code), '') <> ''
      AND o.created_at < v_cutoff
      AND COALESCE(o.discount_usage_consumed, FALSE) = FALSE;
END $$;
