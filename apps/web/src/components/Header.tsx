import { useEffect, useState, type FormEvent } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useCartCount } from "@/store/useCart";
import { useSession } from "@/store/useSession";
import { useWishlist } from "@/store/useWishlist";
import { useSearchHouse } from "@/hooks/useSearchHouse";
import { useSearchIcon } from "@/hooks/useSearchIcon";
import { useSearchPieces } from "@/hooks/useSearchPieces";
import { useSearchSubmit } from "@/hooks/useSearchSubmit";
import { IconAccount, IconBag, IconHeart, IconSearch } from "./Icons";

const links = [
  { to: "/", label: "Home", end: true },
  { to: "/shop", label: "Shop" },
  { to: "/new-arrivals", label: "New Arrivals" },
  { to: "/collections", label: "Collections" },
  { to: "/about", label: "About" },
  { to: "/bespoke", label: "Bespoke" },
  { to: "/contact", label: "Contact" },
];

export function Header({
  storeName,
  logo,
}: {
  storeName: string;
  logo: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const count = useCartCount();
  const saved = useWishlist((state) => state.ids.length);
  const user = useSession((state) => state.user);
  const searchIcon = useSearchIcon();
  const searchHouse = useSearchHouse();
  const searchPieces = useSearchPieces();
  const searchSubmit = useSearchSubmit();

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    document.body.classList.toggle("nav-open", menuOpen);
    return () => document.body.classList.remove("nav-open");
  }, [menuOpen]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <header className="site-header">
      <div className="wrap header-bar">
        <button
          type="button"
          className="icon-btn menu-btn"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          onClick={() => setMenuOpen(true)}
        >
          Menu
        </button>
        <NavLink to="/" className="logo-link" aria-label={`${storeName} home`}>
          <img src={logo} alt={storeName} />
        </NavLink>
        <nav className="desktop-nav" aria-label="Primary">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="header-tools">
          <button
            type="button"
            className="icon-btn"
            aria-label={searchIcon}
            onClick={() => setSearchOpen((open) => !open)}
          >
            <IconSearch />
          </button>
          <NavLink
            to={user ? "/account" : "/account/login"}
            className="icon-btn"
            aria-label={user ? `Account, ${user.firstName}` : "Account"}
          >
            <IconAccount />
          </NavLink>
          <NavLink
            to="/wishlist"
            className="icon-btn"
            aria-label={`Wishlist, ${saved} saved`}
          >
            <IconHeart />
            {saved > 0 ? <span className="bag-count">{saved}</span> : null}
          </NavLink>
          <NavLink
            to="/cart"
            className="icon-btn"
            aria-label={`Bag, ${count} items`}
          >
            <IconBag />
            {count > 0 ? <span className="bag-count">{count}</span> : null}
          </NavLink>
        </div>
      </div>
      {searchOpen ? (
        <div className="search-panel">
          <form className="wrap" onSubmit={submitSearch} role="search">
            <label
              className="sr-only"
              htmlFor="site-search"
              style={{ position: "absolute", left: -9999 }}
            >
              {searchHouse}
            </label>
            <input
              id="site-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPieces}
              autoFocus
            />
            <button type="submit" className="btn btn-line">
              {searchSubmit}
            </button>
          </form>
        </div>
      ) : null}
      {menuOpen ? (
        <div className="mobile-nav" id="mobile-nav">
          <header>
            <img src={logo} alt="" style={{ height: 24 }} />
            <button
              type="button"
              className="link-quiet"
              onClick={() => setMenuOpen(false)}
            >
              Close
            </button>
          </header>
          <nav aria-label="Mobile">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end}>
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
