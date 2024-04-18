import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return '<center><h1>Hello SAEV</h1><img src="https://i.pinimg.com/originals/39/41/8f/39418fc243f36ed2e972f162190e89a8.jpg"></center>';
  }
}
