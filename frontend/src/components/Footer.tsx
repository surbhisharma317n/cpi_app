

interface FooterProps {
  darkMode: boolean;
}

export default function Footer(_props: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="app-footer">
      &copy; {currentYear} CPI Application. All rights reserved.
    </footer>
  );
}

//  <footer className="mb-0 bg-gray-800 text-white p-4">
//   © 2025 Your Company
// </footer>
