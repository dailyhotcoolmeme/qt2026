import React from "react";

export function BookSearch(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 19.5A2.5 2.5 0 016.5 17H18" />
      <path d="M6.5 3H18a2 2 0 012 2v12" />
      <path d="M8 7h8" />
      <circle cx="19" cy="19" r="2" />
      <path d="M21 21l-2.2-2.2" />
    </svg>
  );
}

export default BookSearch;
