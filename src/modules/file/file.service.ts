import { StorageService } from '@codebrew/nestjs-storage';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { join } from 'path';
import * as sharp from 'sharp';
import { UploadFileRequest } from './dto/requests/upload-file.request';
import * as excelJs from 'exceljs';
import * as tmp from 'tmp';

@Injectable()
export class FileService {
  constructor(
    @Inject(StorageService) private readonly storage: StorageService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  getFileByDirAndFilename(dir: string, filename: string) {
    const path = join(__dirname, '../', '../', '../', 'storage', dir, filename);
    const exist = fs.existsSync(path);
    if (!exist) throw new NotFoundException('message.file_not_found');
    return path;
  }

  async upload(req: Express.Multer.File, dir = 'tmp') {
    try {
      const baseUrl = this.config.get('storage.local.root');
      const ext = req.originalname.split('.').pop();
      const randName =
        req.originalname.split('.').shift() + '-' + new Date().getTime();
      const fileLocation = `${baseUrl}/${dir}/${randName}.${ext}`;
      // use sharp to resize image
      const resizedImage = await sharp(req.buffer).toBuffer();
      await this.storage.getDisk().put(fileLocation, resizedImage);
      return fileLocation;
    } catch (error) {
      throw error;
    }
  }
  async delete(fileLocation: string) {
    try {
      await this.storage.getDisk().delete(fileLocation);
      return true;
    } catch (error) {
      throw error;
    }
  }

  async importExcel(filePath: string) {
    try {
      const workbook = new excelJs.Workbook();
      await workbook.xlsx.readFile(filePath);

      const sheet = workbook.getWorksheet(1); // Assuming there is only one sheet

      const jsonData = [];
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber !== 1) {
          // Skip the header row
          const rowData = {};
          row.eachCell((cell, colNumber) => {
            rowData[String(sheet.getCell(1, colNumber).value)] = cell.value;
          });
          jsonData.push(rowData);
        }
      });
      return jsonData;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async exportExcel(json: any, fileName: string, sheetName: string) {
    let rows = [];

    // Add rows
    for (const data of json) {
      const values = Object.values(data);

      // Check if the element contains an image path
      for (const key in data) {
        if (key == 'product_images') {
     

          const imagePath = data['product_images'][0]['url'];
          try {
            const imageBuffer = fs.readFileSync(imagePath);
            const imageBase64 = imageBuffer.toString('base64');
            values['image'] = {
              base64: imageBase64,
              extension: 'png',
            };
         delete data['product_images']
            
          } catch (error) {
            console.error(`Error reading image ${imagePath}:`, error);
          }
        }
      }

      rows.push(values);
    }
    

    const workbook = new excelJs.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);
    rows.unshift(Object.keys(json[0]));
    worksheet.addRows(rows);

    // Add images
    rows.forEach((row, index) => {
      worksheet.getRow(row).height = 50;
      const imagePath = row['image'] && row['image']['base64'];
      if (imagePath) {
        const imageId = workbook.addImage({
          base64: imagePath,
          extension: 'png',
        });

        worksheet.addImage(imageId, {
          tl: { col: rows.length, row: index },
          ext: { width: 50, height: 50 },
        });
      }
    });

    // Set the column widths
    worksheet.columns.forEach((column) => {
      let maxColumnLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxColumnLength) {
          maxColumnLength = columnLength;
        }
      });
      column.width = maxColumnLength + 2;
    });

    let File = await new Promise((resolve, reject) => {
      tmp.file(
        {
          discardDescriptor: true,
          prefix: fileName,
          postfix: '.xlsx',
          mode: parseInt('0600', 8),
        },
        async (err, file) => {
          if (err) {
            reject(err);
            throw new BadRequestException(err);
          }
          try {
            await workbook.xlsx.writeFile(file);
            resolve(file);
          } catch (error) {
            reject(error);
            throw new BadRequestException(error);
          }
        },
      );
    });

    return File;
  }
}
