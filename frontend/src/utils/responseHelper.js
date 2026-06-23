/** Normalize admin API responses (helper.success shape). */
export function getBody(res) {
  return res?.data?.body;
}

export function getMessage(res) {
  return res?.data?.message;
}

export function isSuccess(res) {
  return res?.data?.success === true;
}
