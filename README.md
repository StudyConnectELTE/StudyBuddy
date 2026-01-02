Lokális futtatás VsCode-ban:

- nyissunk meg egy terminált
- nyissuk meg a Docker Desktopot
- futtassuk a következő parancsot: docker compose up --build

Tesztek futtatása (frontend):

- navigáljunk a frontend mappába: cd frontend
- interaktív watch módban: npm test
  - Ha azt írja, hogy "No tests found related to files changed since last commit", akkor:
    - nyomjunk `a`-t az összes teszt futtatásához, vagy
    - futtassuk: npm test -- --watchAll
- egyszeri futtatás (watch nélkül): npm test -- --watchAll=false
- vagy CI módban: CI=true npm test
