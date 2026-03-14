from django.utils.translation import get_language

def get_localized_json_value(value, locale: str | None = None) -> str:
    if value is None:
        return ""

    if isinstance(value, str):
        return value

    if isinstance(value, dict):
        lang = (locale or get_language() or "en").split("-")[0]
        return (
            value.get(lang)
            or value.get("en")
            or value.get("ka")
            or value.get("ru")
            or ""
        )

    return str(value)