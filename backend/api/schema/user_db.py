from django.db import connection

def get_all_user_by_credentials(id=None, limit=20, offset=0, search=None):
    with connection.cursor() as cursor:

        base_query = """
            SELECT id, first_name, middle_name, last_name, email,
                   phone, role, is_active, created_at, updated_at
            FROM auth_user
        """

        params = []

        # ---------------- SINGLE USER ----------------
        if id is not None:
            cursor.execute(
                base_query + " WHERE id = %s",
                [id]
            )
            return cursor.fetchone()

        # ---------------- SEARCH FILTER ----------------
        if search:
            base_query += """
                WHERE first_name ILIKE %s
                   OR last_name ILIKE %s
                   OR email ILIKE %s
                   OR phone ILIKE %s
            """
            search_term = f"%{search}%"
            params.extend([search_term] * 4)

        # ---------------- ORDER + PAGINATION ----------------
        base_query += " ORDER BY id DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])

        cursor.execute(base_query, params)

        return cursor.fetchall()


def add_user_query(first_name, middle_name, last_name, email, password, phone, role):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO "auth_user" (first_name, middle_name, last_name, email, password, phone, role, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id, first_name, middle_name, last_name, email, phone, role, is_active, created_at, updated_at
            """,
            [first_name, middle_name, last_name, email, password, phone, role]
        )
        return cursor.fetchone()

    
def update_user_query(id, first_name, middle_name, last_name, email, password, phone, role):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            UPDATE "auth_user"
            SET first_name = %s,
                middle_name = %s,
                last_name = %s,
                email = %s,
                password = %s,
                phone = %s,
                role = %s,
                updated_at = NOW()
            WHERE id = %s
            RETURNING id, first_name, middle_name, last_name, email, phone, role, is_active, created_at, updated_at
            """,
            [first_name, middle_name, last_name, email, password, phone, role, id]
        )
        return cursor.fetchone()
def partial_update_user_query(id, first_name, middle_name, last_name, email,  phone, role,is_active=None):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            UPDATE "auth_user"
            SET first_name = %s,
                middle_name = %s,
                last_name = %s,
                email = %s,
               
                phone = %s,
                role = %s,
               
                updated_at = NOW()
            WHERE id = %s
            RETURNING id, first_name, middle_name, last_name, email, phone, role, is_active, created_at, updated_at
            """,
            [first_name, middle_name, last_name, email,  phone, role, id]
        )
        return cursor.fetchone()
    
def update__User_account_status(id, is_active):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            UPDATE "auth_user"
            SET 
                is_active = %s,
                updated_at = NOW()
            WHERE id = %s
            RETURNING id, first_name, middle_name, last_name, email, phone, role, is_active, created_at, updated_at
            """,
            [is_active, id]
        )
        return cursor.fetchone()

    
def delete_user_query(id, is_active):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            UPDATE "auth_user"
            SET is_active = %s,
                updated_at = NOW()
            WHERE id = %s
            RETURNING id
            """,
            [is_active, id]
        )
        return cursor.fetchone() is not None


