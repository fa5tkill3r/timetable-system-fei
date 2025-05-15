# Rozvrhový systém pre FEI

Pre lokálne spustenie aplikácie je potrebné mať pripravené aplikačné rozhranie (API), ku ktorému sa frontendová časť systému pripája. Zdrojový kód API je dostupný v repozitári na GitLabe:[https://gitlab.com/elisa11/elisa-api](https://gitlab.com/elisa11/elisa-api).

Aplikáciu je možné spustiť dvoma spôsobmi:

- pomocou Dockeru - vhodné pre produkčné prostredie,
- pomocou Node.js - odporúčané pre vývojové prostredie.

Pred samotným spustením je potrebné správne nakonfigurovať prostredie pomocou súboru `.env`. Súbor [`.env.example`](.env.example) je možné skopírovať ako `.env` a následne upraviť hodnoty podľa potreby. Kľúčovou hodnotou je `VITE_BACKEND_URL` (napr. `VITE_BACKEND_URL=http://localhost:8000`), ktorá musí smerovať na backendové API.

## Spustenie pomocou Dockeru (produkčné prostredie)

1. V koreňovom adresári projektu spustíme príkaz `docker compose up --build -d`
   - prepínač `-d` zabezpečí spustenie kontajnerov na pozadí,
   - prepínač `--build` zabezpečí aktuálne kontajnery.
2. Po spustení bude aplikácia dostupná na adrese `http://localhost:8080`.

## Spustenie pomocou Node.js (vývojové prostredie)

1. Uistíme sa, že máme nainštalovaný Node.js.
2. Nainštalujeme **PNPM** pomocou https://pnpm.io/installation
3. V koreňovom adresári projektu spustíme príkaz `pnpm install` na nainštalovanie závislostí.
4. Spustíme aplikáciu pomocou príkazu `pnpm run dev`.
5. Po spustení sa aplikácia nachádza na adrese `http://localhost:5173`.
