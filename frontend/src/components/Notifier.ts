/**
 * Notifier Utility
 * Provides a universal, styled notification system.
 * @param message The text to display.
 * @param type The type of message, which controls the color ('success' or 'error').
 */
export function showMessage(message: string, type: "success" | "error"): void {
  // Remove any existing message to prevent duplicates
  document.getElementById("page-message")?.remove();

  const messageElement = document.createElement("div");
  messageElement.id = "page-message";
  messageElement.textContent = message;

  messageElement.className =
    "fixed top-24 left-1/2 -translate-x-1/2 p-4 rounded-lg shadow-lg z-[100] border text-white transition-all duration-300";

  if (type === "success") {
    messageElement.classList.add("bg-green-500/80", "border-green-500/95");
  } else {
    messageElement.classList.add("bg-red-500/80", "border-red-500/95");
  }

  document.body.appendChild(messageElement);

  // Auto-hide the message after 3 seconds
  setTimeout(() => {
    messageElement.style.opacity = "0";
    messageElement.style.transform = "translate(-50%, -20px)";
    setTimeout(() => messageElement.remove(), 300);
  }, 3000);
}
