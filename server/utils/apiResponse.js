/**
 * Standardized API response helpers
 */
class ApiResponse {
    static success(res, data, statusCode = 200) {
        return res.status(statusCode).json({
            success: true,
            data,
        });
    }

    static created(res, data) {
        return ApiResponse.success(res, data, 201);
    }

    static error(res, message, statusCode = 500) {
        return res.status(statusCode).json({
            success: false,
            error: message,
        });
    }

    static notFound(res, resource = 'Resource') {
        return ApiResponse.error(res, `${resource} not found`, 404);
    }

    static unauthorized(res, message = 'Not authorized') {
        return ApiResponse.error(res, message, 401);
    }

    static forbidden(res, message = 'Forbidden') {
        return ApiResponse.error(res, message, 403);
    }

    static badRequest(res, message = 'Bad request') {
        return ApiResponse.error(res, message, 400);
    }
}

module.exports = ApiResponse;
