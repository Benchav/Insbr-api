import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

// Aquí irán las rutas después
app.get('/health', (req, res) => {
  res.json({ status: 'OK', branch: 'Diriamba/Jinotepe' });
});

export default app;