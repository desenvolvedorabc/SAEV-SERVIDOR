import { PartialType } from "@nestjs/swagger";
import { CreateStudentsTestsDto } from "./create-students-tests.dto";

export class UpdateStudentsTestsDto extends PartialType(CreateStudentsTestsDto) {
 
}
