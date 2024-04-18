import { BadRequestException } from '@nestjs/common';
import * as path from 'path';

export const pngFileFilter = (req, file, callback) => {
  let ext = path.extname(file.originalname);

  if (ext !== '.png') {
    req.fileValidationError = 'Invalid file type';
    return callback(new BadRequestException('Invalid file type'), false);
  }

  return callback(null, true);
};