# author: jf


class ResumeDocumentError(Exception):
    status_code = 400


class ResumeDocumentBadRequestError(ResumeDocumentError):
    status_code = 400


class ResumeDocumentNotFoundError(ResumeDocumentError):
    status_code = 404


class ResumeDocumentConflictError(ResumeDocumentError):
    status_code = 409


class ResumeDocumentStorageError(ResumeDocumentError):
    status_code = 500
