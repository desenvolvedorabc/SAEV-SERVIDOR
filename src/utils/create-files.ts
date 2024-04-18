import * as fs from "fs";

const dirs = [
  "./public/user/avatar/",
  "./public/student/avatar/",
  "./public/county/file/",
  "./public/county/avatar",
  "./public/school/avatar",
  "./public/teacher/avatar",
  "./public/test/file",
  "./public/test/manual",
  "./public/file/",
  "./public/microdata/"
];

export function createDirs() {
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
