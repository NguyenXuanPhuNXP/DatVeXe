class HttpError extends Error {
  /**
   * @param {number} status  - HTTP status code
   * @param {string} code    - Machine-readable error code
   * @param {string} message - Human-readable message
   * @param {object} [details] - Optional extra context (e.g. { unavailableSeats: ["A1"] })
   */
  constructor(status, code, message, details) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    if (details !== undefined) {
      this.details = details;
    }
  }
}

module.exports = { HttpError };
