// /src/app/layout.js
import { Providers } from "./providers";

export const metadata = {
  title: "Email Dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}