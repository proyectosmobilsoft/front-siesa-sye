/*
  Permite asignar uno o varios centros de operación a cada usuario.
  SQL Server. Script idempotente.

  Conserva auth_usuario.centro_operacion_codigo temporalmente por compatibilidad,
  pero la fuente de verdad pasa a ser auth_usuario_centro_operacion.
*/

SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID(N'dbo.auth_usuario_centro_operacion', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.auth_usuario_centro_operacion (
        usuario_id  int         NOT NULL,
        centro_operacion_codigo varchar(3) NOT NULL,
        created_at  datetime2   NOT NULL
            CONSTRAINT DF_auth_usuario_centro_operacion_created_at DEFAULT (sysutcdatetime()),
        CONSTRAINT PK_auth_usuario_centro_operacion
            PRIMARY KEY (usuario_id, centro_operacion_codigo),
        CONSTRAINT FK_auth_usuario_centro_operacion_usuario
            FOREIGN KEY (usuario_id) REFERENCES dbo.auth_usuario (id) ON DELETE CASCADE,
        CONSTRAINT FK_auth_usuario_centro_operacion_centro
            FOREIGN KEY (centro_operacion_codigo) REFERENCES dbo.auth_centro_operacion (codigo)
    );

    CREATE INDEX IX_auth_usuario_centro_operacion_centro
        ON dbo.auth_usuario_centro_operacion (centro_operacion_codigo, usuario_id);
END;

/* Migra las asignaciones individuales que ya haya realizado el supervisor. */
INSERT INTO dbo.auth_usuario_centro_operacion (usuario_id, centro_operacion_codigo)
SELECT u.id, u.centro_operacion_codigo
FROM dbo.auth_usuario u
WHERE u.centro_operacion_codigo IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM dbo.auth_usuario_centro_operacion uco
      WHERE uco.usuario_id = u.id
        AND uco.centro_operacion_codigo = u.centro_operacion_codigo
  );

COMMIT TRANSACTION;

SELECT
    u.id,
    u.usuario,
    STRING_AGG(uco.centro_operacion_codigo, ',') WITHIN GROUP (ORDER BY uco.centro_operacion_codigo) AS centros_operacion
FROM dbo.auth_usuario u
LEFT JOIN dbo.auth_usuario_centro_operacion uco ON uco.usuario_id = u.id
GROUP BY u.id, u.usuario
ORDER BY u.id;
