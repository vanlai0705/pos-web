import * as XLSX from 'xlsx'
import ExcelJS from 'exceljs'
import { TProductItem } from '@/store/slice/product'
import { TComponentItem } from '@/store/slice/component'
import { baseImageUrl } from '@/constants'

const getFullImageUrl = (imageUrl: string | undefined): string => {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('http')) return imageUrl;
  return `${baseImageUrl}${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;
};

const base64ToFile = (base64String: string, filename: string): File | null => {
  try {

    const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return null;
    }
    
    const mimeType = matches[1];
    const base64Data = matches[2];
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    return new File([blob], filename, { type: mimeType });
  } catch (error) {
    console.error('Error converting base64 to file:', error);
    return null;
  }
};

export const urlToFile = async (url: string, filename: string): Promise<File | null> => {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) {
      console.error('Failed to fetch image:', response.statusText);
      return null;
    }
    const blob = await response.blob();
    const file = new File([blob], filename, { type: blob.type });
    return file;
  } catch (error) {
    console.error('Error converting URL to file:', error);
    return null;
  }
};

const extractImagesFromExcel = async (file: File, sheetName: string, imageColumnIndex: number): Promise<Map<number, File>> => {
  const imageMap = new Map<number, File>();
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    
    const worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) {
      console.warn(`Sheet "${sheetName}" not found`);
      return imageMap;
    }
    

    const images = worksheet.getImages();
    
    if (!images || images.length === 0) {
      console.warn('No images found in worksheet');
      return imageMap;
    }
    
   
    const workbookModel = (workbook as any).model;
    

   
    const media = workbookModel?.media || [];
    
    images.forEach((image, imageIdx) => {
      try {
        const rowIndex = image.range?.tl?.row;
       
        
        if (!rowIndex || rowIndex < 1) {
          return;
        }
        
        const colIndex = image.range?.tl?.col;
     
        
        const dataRowIndex = rowIndex - 2; 

        if (dataRowIndex < 0) {
        }            
        if (imageColumnIndex >= 0 && colIndex !== undefined) {
          const colDiff = Math.abs(colIndex - imageColumnIndex);
          if (colDiff > 2) {
            return;
          }
        }
        
        let imageBuffer: Buffer | Uint8Array | null = null;
        let imageType: string = 'image/png';
        
        const worksheetModel = (worksheet as any).model;
        const sheetRelationships = worksheetModel?.relationships || [];
        
        const relationship = sheetRelationships.find((rel: any) => {
          return String(rel.rId) === String(image.imageId) || rel.rId === image.imageId;
        });
        
        if (relationship) {
          if (relationship.target) {
            const targetMatch = relationship.target.match(/image(\d+)/i);
            if (targetMatch) {
              const mediaIndex = parseInt(targetMatch[1]) - 1;
              if (media[mediaIndex] && media[mediaIndex].buffer) {
                imageBuffer = media[mediaIndex].buffer;
                imageType = media[mediaIndex].type || 'image/png';
              }
            }
          }
        }
        
        if (!imageBuffer && media.length > 0) {
          const imageIdNum = typeof image.imageId === 'string' ? parseInt(image.imageId) : image.imageId;
          if (!isNaN(imageIdNum)) {
            const directIndex = imageIdNum - 1;
            if (directIndex >= 0 && directIndex < media.length && media[directIndex] && media[directIndex].buffer) {
              imageBuffer = media[directIndex].buffer;
              imageType = media[directIndex].type || 'image/png';
            }
          }
        }
        
        if (!imageBuffer && media.length > 0) {
          for (let i = 0; i < media.length; i++) {
            const testMedia = media[i];
            if (testMedia && testMedia.buffer) {
              imageBuffer = testMedia.buffer;
              imageType = testMedia.type || 'image/png';
              break;
            }
          }
        }
        
        if (!imageBuffer) {
          const workbookInternal = (workbook as any);
          const workbookMedia = workbookInternal._media || workbookInternal.media || workbookInternal.model?.media;
          
          if (workbookMedia && Array.isArray(workbookMedia) && workbookMedia.length > 0) {
            const testMedia = workbookMedia[imageIdx] || workbookMedia[0];
            if (testMedia) {
              if (testMedia.buffer) {
                imageBuffer = testMedia.buffer;
                imageType = testMedia.type || 'image/png';
              } else if (testMedia.data) {
                imageBuffer = testMedia.data;
                imageType = testMedia.type || 'image/png';
              } else if (testMedia.base64) {
                try {
                  const binaryString = atob(testMedia.base64);
                  const bytes = new Uint8Array(binaryString.length);
                  for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                  }
                  imageBuffer = bytes;
                  imageType = testMedia.type || 'image/png';
                } catch (e) {
                  console.error('Failed to decode base64 image:', e);
                }
              }
            }
          }
        }
        
        if (!imageBuffer) {
          const worksheetInternal = (worksheet as any);
          const worksheetImages = worksheetInternal._images || worksheetInternal.images;
          if (worksheetImages && Array.isArray(worksheetImages) && worksheetImages.length > imageIdx) {
            const worksheetImage = worksheetImages[imageIdx];
            if (worksheetImage && (worksheetImage.buffer || worksheetImage.data)) {
              imageBuffer = worksheetImage.buffer || worksheetImage.data;
              imageType = worksheetImage.type || 'image/png';
            }
          }
        }
        
        if (!imageBuffer) {
          return;
        }
        
        let extension = 'png';
        let mimeType = imageType;
        
        const buffer = imageBuffer;
        if (buffer.length >= 2) {
          if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
            extension = 'jpg';
            mimeType = 'image/jpeg';
          } else if (buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
            extension = 'png';
            mimeType = 'image/png';
          } else if (buffer.length >= 3 && buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
            extension = 'gif';
            mimeType = 'image/gif';
          } else if (imageType && imageType.includes('jpeg')) {
            extension = 'jpg';
            mimeType = 'image/jpeg';
          } else if (imageType && imageType.includes('png')) {
            extension = 'png';
            mimeType = 'image/png';
          }
        }
        
        const bufferAny = buffer as any;
        let uint8Array: Uint8Array;
        
        if (bufferAny instanceof Uint8Array) {
          uint8Array = bufferAny;
        } else if (bufferAny instanceof ArrayBuffer) {
          uint8Array = new Uint8Array(bufferAny);
        } else if (bufferAny.buffer && bufferAny.byteOffset !== undefined && bufferAny.byteLength !== undefined) {
          uint8Array = new Uint8Array(bufferAny.buffer, bufferAny.byteOffset, bufferAny.byteLength);
        } else if (bufferAny.data) {
          uint8Array = new Uint8Array(bufferAny.data);
        } else {
          try {
            uint8Array = new Uint8Array(bufferAny);
          } catch (e) {
            console.error('Failed to convert buffer to Uint8Array:', e);
            return;
          }
        }
        
        const blob = new Blob([uint8Array as any], { type: mimeType });
        const imageFile = new File([blob], `image_${rowIndex}.${extension}`, { type: mimeType });
        
        let finalDataRowIndex = rowIndex - 2;
        
        if (finalDataRowIndex < 0) {
          finalDataRowIndex = 0;
        }
        
        imageMap.set(finalDataRowIndex, imageFile);
      } catch (error) {
        console.error('Error processing embedded image:', error);
      }
    });
  } catch (error) {
    console.error('Error extracting images from Excel:', error);
  }
  
  return imageMap;
};

export const processImageFromExcel = async (
  imageData: string | undefined | null,
  itemCode: string,
  embeddedImageFile?: File | null
): Promise<File | null> => {
  if (embeddedImageFile) {
    const extension = embeddedImageFile.name.split('.').pop() || 'png';
    return new File([embeddedImageFile], `${itemCode}_${Date.now()}.${extension}`, { type: embeddedImageFile.type });
  }
  
  if (!imageData || typeof imageData !== 'string') {
    return null;
  }
  
  const trimmedData = imageData.trim();
  if (!trimmedData) {
    return null;
  }
  
  if (trimmedData.startsWith('data:image/')) {
    const extension = trimmedData.split(';')[0].split('/')[1] || 'png';
    const filename = `${itemCode}_${Date.now()}.${extension}`;
    return base64ToFile(trimmedData, filename);
  }
  
  if (trimmedData.startsWith('http://') || trimmedData.startsWith('https://')) {
    const extension = trimmedData.split('.').pop()?.split('?')[0] || 'jpg';
    const filename = `${itemCode}_${Date.now()}.${extension}`;
    return await urlToFile(trimmedData, filename);
  }
  
  if (trimmedData.startsWith('/') || !trimmedData.includes('://')) {
    const fullUrl = getFullImageUrl(trimmedData);
    if (fullUrl) {
      const extension = trimmedData.split('.').pop()?.split('?')[0] || 'jpg';
      const filename = `${itemCode}_${Date.now()}.${extension}`;
      return await urlToFile(fullUrl, filename);
    }
  }
  
  return null;
};

export const exportProductsToExcel = (products: TProductItem[]) => {
  const productsData = products.map((product, index) => ({
    'STT': index + 1,
    'Mã sản phẩm': product.code,
    'Tên sản phẩm': product.name,
    'Đơn vị': product.unit,
    'Hình ảnh': getFullImageUrl(product.image_url),
    'Số thành phần': product.product_bom_detail?.length || 0,
    'Ngày tạo': new Date(product.created_at).toLocaleDateString('vi-VN'),
    'Ngày cập nhật': new Date(product.updated_at).toLocaleDateString('vi-VN')
  }));

  const bomData: any[] = [];
  products.forEach((product) => {
    if (product.product_bom_detail && product.product_bom_detail.length > 0) {
      product.product_bom_detail.forEach((component) => {
        bomData.push({
          'Mã sản phẩm': product.code,
          'Tên sản phẩm': product.name,
          'Mã thành phần': component.code,
          'Tên thành phần': component.name,
          'Số lượng': component.quantity,
          'Đơn vị thành phần': component.unit,
          'Giá': component.price || 0,
          'Thành tiền': component.money || 0
        });
      });
    }
  });

  const wb = XLSX.utils.book_new();
  
  const wsProducts = XLSX.utils.json_to_sheet(productsData);
  XLSX.utils.book_append_sheet(wb, wsProducts, 'Sản phẩm');

  if (bomData.length > 0) {
    const wsBom = XLSX.utils.json_to_sheet(bomData);
    XLSX.utils.book_append_sheet(wb, wsBom, 'Thành phần BOM');
  }

  wsProducts['!cols'] = [
    { wch: 5 },
    { wch: 15 },
    { wch: 25 },
    { wch: 10 },
    { wch: 50 },
    { wch: 12 },
    { wch: 15 },
    { wch: 15 }
  ];

  if (bomData.length > 0) {
    const wsBom = XLSX.utils.json_to_sheet(bomData);
    XLSX.utils.book_append_sheet(wb, wsBom, 'Thành phần BOM');
    
    wsBom['!cols'] = [
      { wch: 15 },
      { wch: 25 },
      { wch: 15 },
      { wch: 25 },
      { wch: 10 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 }
    ];
  }

  const fileName = `products_export_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

export const createSampleExcelTemplate = () => {
  const sampleProducts = [
    {
      'STT': 1,
      'Mã sản phẩm': 'SP001',
      'Tên sản phẩm': 'Sản phẩm mẫu 1',
      'Đơn vị': 'cái',
      'Hình ảnh': 'https://example.com/image1.jpg hoặc data:image/png;base64,iVBORw0KG...',
      'Số thành phần': 2,
      'Ngày tạo': new Date().toLocaleDateString('vi-VN'),
      'Ngày cập nhật': new Date().toLocaleDateString('vi-VN')
    },
    {
      'STT': 2,
      'Mã sản phẩm': 'SP002',
      'Tên sản phẩm': 'Sản phẩm mẫu 2',
      'Đơn vị': 'kg',
      'Hình ảnh': '',
      'Số thành phần': 1,
      'Ngày tạo': new Date().toLocaleDateString('vi-VN'),
      'Ngày cập nhật': new Date().toLocaleDateString('vi-VN')
    }
  ];

  const sampleBom = [
    {
      'Mã sản phẩm': 'SP001',
      'Tên sản phẩm': 'Sản phẩm mẫu 1',
      'Mã thành phần': 'TP001',
      'Tên thành phần': 'Thành phần 1',
      'Số lượng': 2,
      'Đơn vị thành phần': 'cái',
      'Giá': 10000,
      'Thành tiền': 20000
    },
    {
      'Mã sản phẩm': 'SP001',
      'Tên sản phẩm': 'Sản phẩm mẫu 1',
      'Mã thành phần': 'TP002',
      'Tên thành phần': 'Thành phần 2',
      'Số lượng': 1,
      'Đơn vị thành phần': 'kg',
      'Giá': 5000,
      'Thành tiền': 5000
    },
    {
      'Mã sản phẩm': 'SP002',
      'Tên sản phẩm': 'Sản phẩm mẫu 2',
      'Mã thành phần': 'TP003',
      'Tên thành phần': 'Thành phần 3',
      'Số lượng': 3,
      'Đơn vị thành phần': 'm',
      'Giá': 15000,
      'Thành tiền': 45000
    }
  ];

  const wb = XLSX.utils.book_new();
  
  const wsProducts = XLSX.utils.json_to_sheet(sampleProducts);
  XLSX.utils.book_append_sheet(wb, wsProducts, 'Sản phẩm');

  const wsBom = XLSX.utils.json_to_sheet(sampleBom);
  XLSX.utils.book_append_sheet(wb, wsBom, 'Thành phần BOM');

  wsProducts['!cols'] = [
    { wch: 5 },
    { wch: 15 },
    { wch: 25 },
    { wch: 10 },
    { wch: 50 },
    { wch: 12 },
    { wch: 15 },
    { wch: 15 }
  ];

  wsBom['!cols'] = [
    { wch: 15 },
    { wch: 25 },
    { wch: 15 },
    { wch: 25 },
    { wch: 10 },
    { wch: 15 },
    { wch: 12 },
    { wch: 12 }
  ];

  const fileName = 'products_template.xlsx';
  XLSX.writeFile(wb, fileName);
};

export const exportProductBomToExcel = (products: TProductItem[]) => {
  const bomData: any[] = [];
  let stt = 1;

  products.forEach((product) => {
    if (product.product_bom_detail && product.product_bom_detail.length > 0) {
      product.product_bom_detail.forEach((component) => {
        bomData.push({
          'Stt': stt++,
          'Tên linh kiện': component.name || '',
          'Ký hiệu': component.code || '',
          'SL': component.quantity || 0,
          'Đ. giá': component.price || 0,
          'T.tiền': component.money || (component.price || 0) * (component.quantity || 0)
        });
      });
    }
  });

  const wb = XLSX.utils.book_new();
  
  if (bomData.length > 0) {
    const wsBom = XLSX.utils.json_to_sheet(bomData);
    XLSX.utils.book_append_sheet(wb, wsBom, 'Product BOM');

    wsBom['!cols'] = [
      { wch: 5 },
      { wch: 30 },
      { wch: 15 },
      { wch: 8 },
      { wch: 12 },
      { wch: 12 }
    ];
  } else {
    const emptyData = [{
      'Stt': '',
      'Tên linh kiện': '',
      'Ký hiệu': '',
      'SL': '',
      'Đ. giá': '',
      'T.tiền': ''
    }];
    const wsBom = XLSX.utils.json_to_sheet(emptyData);
    XLSX.utils.book_append_sheet(wb, wsBom, 'Product BOM');
    
    wsBom['!cols'] = [
      { wch: 5 },
      { wch: 30 },
      { wch: 15 },
      { wch: 8 },
      { wch: 12 },
      { wch: 12 }
    ];
  }

  const fileName = `Product_BOM_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

export const importProductsFromExcel = (file: File): Promise<{
  products: Array<{
    code: string;
    name: string;
    unit: string;
    image_data?: string;
    embedded_image?: File;
    bom_components: Array<{
      component_code: string;
      component_name: string;
      quantity: number;
      component_unit: string;
      price?: number;
      money?: number;
    }>;
  }>;
  errors: string[];
}> => {
  return new Promise(async (resolve, reject) => {
    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          const errors: string[] = [];
          const products: any[] = [];
          
          const productsSheet = workbook.Sheets['Sản phẩm'];
          if (!productsSheet) {
            errors.push('Không tìm thấy sheet "Sản phẩm"');
            resolve({ products: [], errors });
            return;
          }
          
          const productsData = XLSX.utils.sheet_to_json(productsSheet);
          
          const headers = XLSX.utils.sheet_to_json(productsSheet, { header: 1 })[0] as string[];
          const imageColumnIndex = headers.findIndex(h => h === 'Hình ảnh');
          
          let imageMap = new Map<number, File>();
          try {
            imageMap = await extractImagesFromExcel(file, 'Sản phẩm', imageColumnIndex);
          } catch (imageError) {
            console.warn('Could not extract embedded images, continuing with text data only:', imageError);
          }
          
          const bomSheet = workbook.Sheets['Thành phần BOM'];
          const bomData = bomSheet ? XLSX.utils.sheet_to_json(bomSheet) : [];
          
          productsData.forEach((row: any, index: number) => {
            const productCode = row['Mã sản phẩm'];
            const productName = row['Tên sản phẩm'];
            const unit = row['Đơn vị'];
            const imageData = row['Hình ảnh'] || '';
            const embeddedImage = imageMap.get(index);
            
            if (!productCode || !productName || !unit) {
              errors.push(`Dòng ${index + 2}: Thiếu thông tin bắt buộc (Mã sản phẩm, Tên sản phẩm, Đơn vị)`);
              return;
            }
            
            const productBomComponents = bomData.filter((bomRow: any) => 
              bomRow['Mã sản phẩm'] === productCode
            );
            
            const bomComponents = productBomComponents.map((bomRow: any) => ({
              component_code: bomRow['Mã thành phần'] || '',
              component_name: bomRow['Tên thành phần'] || '',
              quantity: Number(bomRow['Số lượng']) || 1,
              component_unit: bomRow['Đơn vị thành phần'] || '',
              price: Number(bomRow['Giá']) || 0,
              money: Number(bomRow['Thành tiền']) || 0
            }));
            
            products.push({
              code: productCode,
              name: productName,
              unit: unit,
              image_data: imageData ? String(imageData).trim() : undefined,
              embedded_image: embeddedImage,
              bom_components: bomComponents
            });
          });
          
          resolve({ products, errors });
        } catch (error) {
          reject(new Error('Lỗi khi đọc file Excel: ' + (error as Error).message));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Lỗi khi đọc file'));
      };
      
      reader.readAsArrayBuffer(file);
    } catch (error) {
      reject(new Error('Lỗi khi xử lý file: ' + (error as Error).message));
    }
  });
};

export const exportComponentsToExcel = (components: TComponentItem[]) => {
  const componentsData = components.map((component, index) => ({
    'STT': index + 1,
    'Mã linh kiện': component.code,
    'Tên linh kiện': component.name,
    'Đơn vị': component.unit,
    'Hình ảnh': getFullImageUrl(component.image_url),
    'Ngày tạo': new Date(component.created_at).toLocaleDateString('vi-VN'),
    'Ngày cập nhật': new Date(component.updated_at).toLocaleDateString('vi-VN')
  }));

  const wb = XLSX.utils.book_new();
  const wsComponents = XLSX.utils.json_to_sheet(componentsData);
  XLSX.utils.book_append_sheet(wb, wsComponents, 'Linh kiện');

  wsComponents['!cols'] = [
    { wch: 5 },
    { wch: 15 },
    { wch: 30 },
    { wch: 10 },
    { wch: 50 },
    { wch: 15 },
    { wch: 15 }
  ];

  const fileName = `components_export_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

export const createComponentsExcelTemplate = () => {
  const sampleComponents = [
    {
      'STT': 1,
      'Mã linh kiện': 'LK001',
      'Tên linh kiện': 'Linh kiện mẫu 1',
      'Đơn vị': 'cái',
      'Hình ảnh': 'https://example.com/image1.jpg hoặc data:image/png;base64,iVBORw0KG...',
      'Ngày tạo': new Date().toLocaleDateString('vi-VN'),
      'Ngày cập nhật': new Date().toLocaleDateString('vi-VN')
    },
    {
      'STT': 2,
      'Mã linh kiện': 'LK002',
      'Tên linh kiện': 'Linh kiện mẫu 2',
      'Đơn vị': 'kg',
      'Hình ảnh': '',
      'Ngày tạo': new Date().toLocaleDateString('vi-VN'),
      'Ngày cập nhật': new Date().toLocaleDateString('vi-VN')
    }
  ];

  const wb = XLSX.utils.book_new();
  const wsComponents = XLSX.utils.json_to_sheet(sampleComponents);
  XLSX.utils.book_append_sheet(wb, wsComponents, 'Linh kiện');

  wsComponents['!cols'] = [
    { wch: 5 },
    { wch: 15 },
    { wch: 30 },
    { wch: 10 },
    { wch: 50 },
    { wch: 15 },
    { wch: 15 }
  ];

  const fileName = 'components_template.xlsx';
  XLSX.writeFile(wb, fileName);
};

export const importComponentsFromExcel = (file: File): Promise<{
  components: Array<{
    code: string;
    name: string;
    unit: string;
    image_data?: string;
    embedded_image?: File;
  }>;
  errors: string[];
}> => {
  return new Promise(async (resolve, reject) => {
    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          const errors: string[] = [];
          const components: any[] = [];
          
          const componentsSheet = workbook.Sheets['Linh kiện'];
          if (!componentsSheet) {
            errors.push('Không tìm thấy sheet "Linh kiện"');
            resolve({ components: [], errors });
            return;
          }
          
          const componentsData = XLSX.utils.sheet_to_json(componentsSheet);
          
          const headers = XLSX.utils.sheet_to_json(componentsSheet, { header: 1 })[0] as string[];
          const imageColumnIndex = headers.findIndex(h => h === 'Hình ảnh');
          
          let imageMap = new Map<number, File>();
          try {
            imageMap = await extractImagesFromExcel(file, 'Linh kiện', imageColumnIndex);
          } catch (imageError) {
            console.warn('Could not extract embedded images, continuing with text data only:', imageError);
          }
          
          componentsData.forEach((row: any, index: number) => {
            const code = row['Mã linh kiện'];
            const name = row['Tên linh kiện'];
            const unit = row['Đơn vị'];
            const imageData = row['Hình ảnh'] || '';
            const embeddedImage = imageMap.get(index);
            
            
            if (!code || !name || !unit) {
              errors.push(`Dòng ${index + 2}: Thiếu thông tin bắt buộc (Mã linh kiện, Tên linh kiện, Đơn vị)`);
              return;
            }
            
            components.push({
              code: code,
              name: name,
              unit: unit,
              image_data: imageData ? String(imageData).trim() : undefined,
              embedded_image: embeddedImage
            });
          });
          
          resolve({ components, errors });
        } catch (error) {
          reject(new Error('Lỗi khi đọc file Excel: ' + (error as Error).message));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Lỗi khi đọc file'));
      };
      
      reader.readAsArrayBuffer(file);
    } catch (error) {
      reject(new Error('Lỗi khi xử lý file: ' + (error as Error).message));
    }
  });
};

