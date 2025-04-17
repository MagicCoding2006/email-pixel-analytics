"use client";  // ← this file is a client component

import { ChakraProvider, defaultSystem } from "@chakra-ui/react";

export function Providers({ children }) {
    return (
        <ChakraProvider resetCSS value={defaultSystem}>
            {children}
        </ChakraProvider>
    );
}