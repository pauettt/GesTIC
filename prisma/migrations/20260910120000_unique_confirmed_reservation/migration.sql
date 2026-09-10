-- Impedeix a nivell de base de dades que un carro tingui dues reserves
-- CONFIRMADES per a la mateixa franja. Fins ara la comprovació es feia a
-- l'aplicació (llegir i després escriure), i dos professors prement el mateix
-- botó alhora la superaven tots dos.
--
-- L'índex és PARCIAL a propòsit: només s'aplica a les confirmades. Si hi
-- entressin les cancel·lades, un professor que reservi, cancel·li i torni a
-- reservar la mateixa franja xocaria contra l'índex sense motiu.
CREATE UNIQUE INDEX "Reservation_cart_slot_confirmed_key"
  ON "Reservation" ("cartId", "startDate")
  WHERE "status" = 'CONFIRMADA';
