import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import accountRoutes from './routes/account.routes';
import { errorHandler } from './middleware/error-handler';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));

// Swagger docs
const swaggerDocument = YAML.load(path.join(__dirname, 'swagger.yaml')) as object;
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Routes
app.use('/accounts', accountRoutes);

// Error handler (must be last)
app.use(errorHandler);

export default app;
//app.ts