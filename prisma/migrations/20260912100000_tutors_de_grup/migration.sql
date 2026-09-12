-- Tutors de grup. No és un rol nou: és una característica que se suma al que
-- l'usuari ja té, perquè un coordinador TIC també pot ser tutor d'un grup i ha
-- de conservar la resta de permisos. La dona i la treu el super admin des de
-- /usuaris.
--
-- Columna amb DEFAULT false i NOT NULL: els usuaris que ja hi ha entren com a
-- no tutors, que és el que toca fins que algú els marqui.
ALTER TABLE "User" ADD COLUMN "isTutor" BOOLEAN NOT NULL DEFAULT false;
