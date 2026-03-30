import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedTablesWithData1774901880013 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========================
    // Seed Books
    // ========================
    await queryRunner.query(`
      INSERT INTO books (title, author, isbn, available_quantity, shelf_location)
      VALUES
        ('Clean Code', 'Robert C. Martin', '9780132350884', 5, 'A1'),
        ('The Pragmatic Programmer', 'Andrew Hunt', '9780201616224', 3, 'A2'),
        ('Design Patterns', 'Erich Gamma', '9780201633610', 4, 'B1'),
        ('Refactoring', 'Martin Fowler', '9780201485677', 2, 'B2'),
        ('Domain-Driven Design', 'Eric Evans', '9780321125217', 6, 'C1');
    `);

    // ========================
    // Seed Borrowers
    // ========================
    await queryRunner.query(`
      INSERT INTO borrowers (name, email)
      VALUES
        ('Ahmed Mohamed', 'ahmed@example.com'),
        ('Sara Ali', 'sara@example.com'),
        ('Omar Hassan', 'omar@example.com');
    `);

    // ========================
    // Seed Borrowing Records
    // (Assumes IDs start from 1)
    // ========================
    await queryRunner.query(`
      INSERT INTO borrowing_records (book_id, borrower_id, due_date, status)
      VALUES
        (1, 1, NOW() + INTERVAL 7 DAY, 'checked_out'),
        (2, 2, NOW() + INTERVAL 10 DAY, 'checked_out'),
        (3, 3, NOW() + INTERVAL 5 DAY, 'checked_out');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM borrowing_records
      WHERE book_id IN (1,2,3);
    `);

    await queryRunner.query(`
      DELETE FROM borrowers
      WHERE email IN ('ahmed@example.com', 'sara@example.com', 'omar@example.com');
    `);

    await queryRunner.query(`
      DELETE FROM books
      WHERE isbn IN (
        '9780132350884',
        '9780201616224',
        '9780201633610',
        '9780201485677',
        '9780321125217'
      );
    `);
  }
}
