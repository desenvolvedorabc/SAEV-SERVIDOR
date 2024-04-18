export const imageFileFilter = (_req, file, callback) => {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return callback(new Error('Apenas imagens são aceitas!'), false);
    }
    callback(null, true);
  };
  
  export const docFileFilter = (_req, file, callback) => {
    if (!file.originalname.match(/\.(pdf|doc|docx|txt)$/)) {
      return callback(new Error('Apenas pdf,doc,docx e txt são aceitos!'), false);
    }
    callback(null, true);
  };