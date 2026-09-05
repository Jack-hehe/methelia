"use client";
import { useRef } from "react";
import { ArrowUpRight, X } from "lucide-react";
import { homeCopy, type HomeLanguage } from "./home-language";

export function LoginEntry({ language }: { language: HomeLanguage }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const copy = homeCopy[language];
  return (
    <div className="login-entry">
      <button
        className="login-button"
        onClick={() => dialog.current?.showModal()}
      >
        {copy.login}
        <ArrowUpRight size={14} />
      </button>
      <dialog
        className="login-dialog"
        ref={dialog}
        aria-labelledby="login-title"
        aria-describedby="login-description"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            const bounds = event.currentTarget.getBoundingClientRect();
            if (
              event.clientX < bounds.left ||
              event.clientX > bounds.right ||
              event.clientY < bounds.top ||
              event.clientY > bounds.bottom
            )
              dialog.current?.close();
          }
        }}
      >
        <button
          className="icon-button login-close"
          aria-label={copy.dismiss}
          onClick={() => dialog.current?.close()}
        >
          <X size={18} />
        </button>
        <img
          className="login-logo"
          src="/icon.svg"
          alt="Methelia"
          width={64}
          height={64}
        />
        <h2 id="login-title">{copy.loginTitle}</h2>
        <p id="login-description">{copy.loginMessage}</p>
        <button
          className="primary-button"
          onClick={() => dialog.current?.close()}
        >
          {copy.loginClose}
        </button>
      </dialog>
    </div>
  );
}
