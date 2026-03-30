import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateBorrowingRecordsTable1774899170881 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'borrowing_records',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'book_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'borrower_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'checkout_date',
            type: 'timestamp',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'due_date',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'return_date',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['checked_out', 'returned', 'overdue'],
            isNullable: false,
            default: "'checked_out'",
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

    await queryRunner.createForeignKey(
      'borrowing_records',
      new TableForeignKey({
        name: 'fk_br_book_id',
        columnNames: ['book_id'],
        referencedTableName: 'books',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'borrowing_records',
      new TableForeignKey({
        name: 'fk_br_borrower_id',
        columnNames: ['borrower_id'],
        referencedTableName: 'borrowers',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    // Index on status — used for overdue queries and active-borrow lookups
    await queryRunner.createIndex(
      'borrowing_records',
      new TableIndex({
        name: 'idx_br_status',
        columnNames: ['status'],
      }),
    );

    // Index on due_date — used to find overdue books efficiently
    await queryRunner.createIndex(
      'borrowing_records',
      new TableIndex({
        name: 'idx_br_due_date',
        columnNames: ['due_date'],
      }),
    );

    // Composite: (borrower_id, status) — "books currently held by borrower X"
    await queryRunner.createIndex(
      'borrowing_records',
      new TableIndex({
        name: 'idx_br_borrower_status',
        columnNames: ['borrower_id', 'status'],
      }),
    );

    // Composite: (book_id, status) — "is this book currently checked out?"
    await queryRunner.createIndex(
      'borrowing_records',
      new TableIndex({
        name: 'idx_br_book_status',
        columnNames: ['book_id', 'status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('borrowing_records', 'idx_br_book_status');
    await queryRunner.dropIndex('borrowing_records', 'idx_br_borrower_status');
    await queryRunner.dropIndex('borrowing_records', 'idx_br_due_date');
    await queryRunner.dropIndex('borrowing_records', 'idx_br_status');
    await queryRunner.dropForeignKey('borrowing_records', 'fk_br_borrower_id');
    await queryRunner.dropForeignKey('borrowing_records', 'fk_br_book_id');
    await queryRunner.dropTable('borrowing_records');
  }
}
