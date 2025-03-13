import React from "react";

export function Header() {
  return (
    <header>
      <nav>
        <ul>
          <li>
            <a href="/" title="Go to home">
              Home
            </a>
          </li>
          <li>
            <a href="/about" title="Go to about">
              About
            </a>
          </li>
          <li>
            <a href="/contact" title="Go to contact">
              Contact
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
}
