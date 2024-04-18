import { User } from "src/user/model/entities/user.entity";
import { TypeMicrodata } from "./type-microdata.enum";
import { County } from "src/counties/model/entities/county.entity";

export class CreateMicrodatumDto {
  user: User;

  county: County;

  type: TypeMicrodata;

  file: string;
}
