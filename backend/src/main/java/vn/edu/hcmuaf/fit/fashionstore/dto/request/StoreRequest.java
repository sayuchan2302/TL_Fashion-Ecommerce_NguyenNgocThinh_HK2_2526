package vn.edu.hcmuaf.fit.fashionstore.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoreRequest {

    private String name;

    private String slug;

    private String description;

    private String logo;

    private String banner;

    private String contactEmail;

    private String phone;

    private String address;
}
