import {
  Body,
  Controller,
  HttpCode,
  Patch,
  Post,
  UseGuards,
  ValidationPipe,
  Headers,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../guard/jwt-auth.guard";
import { ChangePasswordDto } from "../model/dto/ChangePasswordDto";
import { ForgotPasswordDto } from "../model/dto/ForgotPasswordDto";
import { LoginUserDto } from "../model/dto/LoginUserDto";
import { AuthService } from "../service/auth.service";

@Controller("login")
@ApiTags("Login")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post("/")
  @HttpCode(200)
  // eslint-disable-next-line @typescript-eslint/ban-types
  login(@Body() loginUserDto: LoginUserDto): Promise<Object> {
    return this.authService.login(loginUserDto).then((jwt: string) => {
      return {
        access_token: jwt,
        token_type: "JWT",
        expires_in: process.env.JWT_SECONDS_EXPIRE,
      };
    });
  }

  @Post("/recovery-password")
  async forgotPassword(
    @Body(new ValidationPipe()) forgotPasswordDto: ForgotPasswordDto,
  ): Promise<boolean> {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Patch("/reset-password")
  resetPassword(
    @Body(new ValidationPipe()) changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.resetPassword(changePasswordDto);
  }

  @Patch("/confirm-new-password")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async changePassword(
    @Headers() headers,
    @Body(new ValidationPipe()) changePasswordDto: ChangePasswordDto,
  ): Promise<boolean> {
    return this.authService.changePassword(
      headers.authorization,
      changePasswordDto,
    );
  }
}
