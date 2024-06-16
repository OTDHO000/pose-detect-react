import express, { Request, Response } from 'express';
import path from 'path';


  const app = express();
  const port = 3500;
  
  // 设置静态文件目录
  app.use(express.static(path.join(__dirname, 'public')));
  
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'model', 'index.html'));
  });
  
  app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
  });