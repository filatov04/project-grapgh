from fastapi import Request


def get_current_user_id(request: Request) -> int:
    """
    Получить ID текущего пользователя из request.state.
    Устанавливается AuthMiddleware после проверки JWT токена.
    """
    return request.state.user_id


def get_current_user_email(request: Request) -> str:
    """
    Получить email текущего пользователя из request.state.
    Устанавливается AuthMiddleware после проверки JWT токена.
    """
    return request.state.user_email
