import Swal from "sweetalert2";

/* LOADING */
export function showLoading(title, text) {
  return Swal.fire({
    title,
    text,
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });
}

/* CLOSE */
export function closeAlert() {
  Swal.close();
}

/* SUCCESS */
export function showSuccess(title, text) {
  return Swal.fire({
    icon: "success",
    title,
    text,
    showConfirmButton: false,
    timer: 1500,
    timerProgressBar: true,
  });
}

/* ERROR */
export function showError(title, text) {
  return Swal.fire({
    icon: "error",
    title,
    text,
  });
}

/* LOGOUT */
export const showConfirm = (message) => {
  return Swal.fire({
    icon: "warning",
    title: "Are you sure?",
    text: message,
    showCancelButton: true,
    confirmButtonText: "Yes",
    cancelButtonText: "Cancel",
  });
};

/* RESERVATION */ 
