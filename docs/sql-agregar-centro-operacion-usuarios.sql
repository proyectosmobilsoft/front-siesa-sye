/*
  Catálogo de centros de operación y asignación por usuario.
  SQL Server. Es seguro ejecutar este script más de una vez.

  Los usuarios existentes quedan con centro_operacion_codigo = NULL para no
  asignarles un C.O. incorrecto. Al editarlos desde el frontend será obligatorio
  seleccionar 001 o 002.
*/

SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID(N'dbo.auth_centro_operacion', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.auth_centro_operacion (
        codigo      varchar(3)   NOT NULL,
        nombre      varchar(100) NOT NULL,
        activo      bit          NOT NULL CONSTRAINT DF_auth_centro_operacion_activo DEFAULT (1),
        created_at  datetime2    NOT NULL CONSTRAINT DF_auth_centro_operacion_created_at DEFAULT (sysutcdatetime()),
        CONSTRAINT PK_auth_centro_operacion PRIMARY KEY (codigo)
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.auth_centro_operacion WHERE codigo = '001')
    INSERT INTO dbo.auth_centro_operacion (codigo, nombre) VALUES ('001', 'C.O. 001');

IF NOT EXISTS (SELECT 1 FROM dbo.auth_centro_operacion WHERE codigo = '002')
    INSERT INTO dbo.auth_centro_operacion (codigo, nombre) VALUES ('002', 'C.O. 002');

IF COL_LENGTH(N'dbo.auth_usuario', N'centro_operacion_codigo') IS NULL
BEGIN
    ALTER TABLE dbo.auth_usuario
        ADD centro_operacion_codigo varchar(3) NULL;
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = N'FK_auth_usuario_centro_operacion'
)
BEGIN
    ALTER TABLE dbo.auth_usuario WITH CHECK
        ADD CONSTRAINT FK_auth_usuario_centro_operacion
        FOREIGN KEY (centro_operacion_codigo)
        REFERENCES dbo.auth_centro_operacion (codigo);
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.auth_usuario')
      AND name = N'IX_auth_usuario_centro_operacion'
)
BEGIN
    CREATE INDEX IX_auth_usuario_centro_operacion
        ON dbo.auth_usuario (centro_operacion_codigo);
END;

COMMIT TRANSACTION;

SELECT codigo, nombre, activo
FROM dbo.auth_centro_operacion
ORDER BY codigo;

SELECT id, usuario, centro_operacion_codigo
FROM dbo.auth_usuario
ORDER BY id;
