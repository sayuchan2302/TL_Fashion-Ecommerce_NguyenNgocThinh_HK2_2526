import re

with open('src/main/java/vn/edu/hcmuaf/fit/fashionstore/Seeder/MarketplaceSeeder.java', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('Double basePrice', 'BigDecimal basePrice')
content = content.replace('Double salePrice', 'BigDecimal salePrice')
content = content.replace('double shippingFee', 'BigDecimal shippingFee')
content = content.replace('double discount', 'BigDecimal discount')
content = content.replace('double priceAdjustment', 'BigDecimal priceAdjustment')
content = content.replace('double unitPrice', 'BigDecimal unitPrice')
content = content.replace('double discountValue', 'BigDecimal discountValue')
content = content.replace('double minOrderValue', 'BigDecimal minOrderValue')
content = content.replace('double subtotal', 'BigDecimal subtotal')
content = content.replace('double commission', 'BigDecimal commission')

def replace_d_literal(match):
    val = match.group(1).replace('_', '')
    return f'new BigDecimal("{val}")'

content = re.sub(r'([\d_]+(?:\.\d+)?)d', replace_d_literal, content)

content = content.replace('Math.round(order.getTotal() * 0.05 * 100.0) / 100.0', 'order.getTotal().multiply(new BigDecimal("0.05"))')
content = content.replace('order.setVendorPayout(order.getTotal() - commission)', 'order.setVendorPayout(order.getTotal().subtract(commission))')
content = re.sub(r'\.mapToDouble\(Double::doubleValue\)\s*\.sum\(\)', '.reduce(BigDecimal.ZERO, BigDecimal::add)', content)
content = content.replace('unitPrice * quantity', 'unitPrice.multiply(BigDecimal.valueOf(quantity))')

if 'import java.math.BigDecimal;' not in content:
    content = content.replace('import java.util.UUID;', 'import java.util.UUID;\nimport java.math.BigDecimal;')

# Print a message indicating it ran
print("Replaced substrings successfully")

with open('src/main/java/vn/edu/hcmuaf/fit/fashionstore/Seeder/MarketplaceSeeder.java', 'w', encoding='utf-8') as f:
    f.write(content)
