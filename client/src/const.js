export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Send the user to the sign-in page. Kept as a function (not a plain href)
// so existing callers can invoke it the same way as before:
// `onClick={() => startLogin()}` or `onClick={startLogin}`.
export const startLogin = () => {
  window.location.href = "/signin";
};
