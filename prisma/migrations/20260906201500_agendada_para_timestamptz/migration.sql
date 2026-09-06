-- Instante real, não relógio de parede.
-- TIMESTAMP sem fuso faz o Postgres aplicar o TimeZone da sessão em
-- `agendadaPara <= now()`: 09:00 Brasília (gravado 12:00 UTC) virava 12:00
-- local e o primeiro post do dia saía 3h atrasado.
ALTER TABLE "publicacoes"
  ALTER COLUMN "agendadaPara" TYPE TIMESTAMPTZ(3)
  USING "agendadaPara" AT TIME ZONE 'UTC';

ALTER TABLE "publicacoes"
  ALTER COLUMN "publicadaEm" TYPE TIMESTAMPTZ(3)
  USING "publicadaEm" AT TIME ZONE 'UTC';
