async function retryTransaction(run, retries = 2) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      if (error.code !== "P2034" || attempt >= retries) throw error;
      await new Promise((resolve) => setTimeout(resolve, 25 * (attempt + 1)));
    }
  }
}
module.exports = { retryTransaction };
