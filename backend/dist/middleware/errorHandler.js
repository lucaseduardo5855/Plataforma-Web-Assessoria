"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.createError = exports.errorHandler = void 0;
const errorHandler = (error, req, res, next) => {
    let { statusCode = 500, message } = error;
    console.error(`❌ Erro ${statusCode}: ${message}`);
    console.error('Stack:', error.stack);
    if (error.name === 'PrismaClientKnownRequestError') {
        statusCode = 400;
        message = 'Erro na operação do banco de dados';
    }
    if (error.name === 'ValidationError') {
        statusCode = 400;
    }
    if (error.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Token inválido';
    }
    if (error.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expirado';
    }
    res.status(statusCode).json({
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
};
exports.errorHandler = errorHandler;
const createError = (message, statusCode = 500) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.isOperational = true;
    return error;
};
exports.createError = createError;
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
//# sourceMappingURL=errorHandler.js.map