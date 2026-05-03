<?php

declare(strict_types=1);

namespace Doppar\Insight\Tests\DB;

use Doppar\Insight\Collectors\SqlCollector;
use Doppar\Insight\DB\ProfilerPdoStatement;
use Doppar\Insight\Tests\TestCase;
use PDO;
use Phaseolies\Database\Database;
use ReflectionProperty;

class ProfilerPdoStatementTest extends TestCase
{
    private PDO $pdo;

    private SqlCollector $collector;

    protected function setUp(): void
    {
        parent::setUp();

        $this->pdo = new PDO('sqlite::memory:');
        $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $this->pdo->setAttribute(PDO::ATTR_STATEMENT_CLASS, [ProfilerPdoStatement::class, ['sqlite_test', 'sqlite']]);
        $this->pdo->exec('CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)');
        $this->pdo->exec("INSERT INTO users (name) VALUES ('A'), ('B'), ('C')");

        $connections = new ReflectionProperty(Database::class, 'connections');
        $connections->setAccessible(true);
        $currentConnections = $connections->getValue();
        $currentConnections['sqlite_test'] = $this->pdo;
        $connections->setValue($currentConnections);

        $this->collector = new SqlCollector();
        $this->collector->start($this->createRequest());
    }

    protected function tearDown(): void
    {
        SqlCollector::setActive(null);

        $connections = new ReflectionProperty(Database::class, 'connections');
        $connections->setAccessible(true);
        $currentConnections = $connections->getValue();
        unset($currentConnections['sqlite_test']);
        $connections->setValue($currentConnections);

        parent::tearDown();
    }

    public function testCountsSqliteSelectResultRowsUsingFallbackQuery(): void
    {
        $statement = $this->pdo->prepare('SELECT * FROM users ORDER BY id DESC LIMIT 2');
        $statement->execute();
        $rows = $statement->fetchAll(PDO::FETCH_ASSOC);

        $data = $this->collector->toArray();

        $this->assertCount(2, $rows);
        $this->assertSame(2, $data['sql'][0]['row_count']);
        $this->assertSame('SELECT * FROM users ORDER BY id DESC LIMIT 2', $data['sql'][0]['sql']);
    }

    public function testCountsSqliteAggregateResultRowsAsReturnedRows(): void
    {
        $statement = $this->pdo->prepare('SELECT COUNT(*) as aggregate FROM users LIMIT 1');
        $statement->execute();
        $result = $statement->fetch(PDO::FETCH_ASSOC);

        $data = $this->collector->toArray();

        $this->assertSame('3', (string) $result['aggregate']);
        $this->assertSame(1, $data['sql'][0]['row_count']);
    }

    public function testKeepsNativeRowCountForSqliteWriteQueries(): void
    {
        $statement = $this->pdo->prepare('UPDATE users SET name = ? WHERE id = ?');
        $statement->execute(['Updated', 1]);

        $data = $this->collector->toArray();

        $this->assertSame(1, $data['sql'][0]['row_count']);
    }
}
