import { Link, LinkProps } from "react-router-dom";
import { MdArrowBack } from "react-icons/md";
import "./BackLink.css";

/** Shared back navigation with a comfortable target and consistent icon spacing. */
export default function BackLink({
  children,
  className = "",
  ...props
}: LinkProps) {
  return (
    <Link {...props} className={`page-back-link ${className}`}>
      <MdArrowBack aria-hidden="true" />
      <span>{children}</span>
    </Link>
  );
}
