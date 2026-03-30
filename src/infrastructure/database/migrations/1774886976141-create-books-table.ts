import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateBooksTable1774886976141 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'books',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'author',
            type: 'varchar',
            length: '150',
            isNullable: false,
          },
          {
            name: 'isbn',
            type: 'varchar',
            length: '20',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'available_quantity',
            type: 'int',
            isNullable: false,
            default: 0,
          },
          {
            name: 'shelf_location',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'books',
      new TableIndex({
        name: 'idx_books_title',
        columnNames: ['title'],
      }),
    );

    await queryRunner.createIndex(
      'books',
      new TableIndex({
        name: 'idx_books_author',
        columnNames: ['author'],
      }),
    );

    await queryRunner.createIndex(
      'books',
      new TableIndex({
        name: 'idx_books_deleted_at',
        columnNames: ['deleted_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('books', 'idx_books_deleted_at');
    await queryRunner.dropIndex('books', 'idx_books_author');
    await queryRunner.dropIndex('books', 'idx_books_title');
    await queryRunner.dropTable('books');
  }
}
