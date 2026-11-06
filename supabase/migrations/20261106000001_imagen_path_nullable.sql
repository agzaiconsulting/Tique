-- Permite marcar que la imagen ya fue borrada del Storage
alter table tickets alter column imagen_path drop not null;
