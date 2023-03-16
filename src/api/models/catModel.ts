import {promisePool} from '../../database/db';
import CustomError from '../../classes/CustomError';
import {ResultSetHeader} from 'mysql2';
import {Cat, GetCat, PostCat, PutCat} from '../../interfaces/Cat';
import {User} from '../../interfaces/User';

const getAllCats = async (): Promise<Cat[]> => {
  const [rows] = await promisePool.execute<GetCat[]>(
    `
    SELECT cat_id, cat_name, weight, filename, birthdate, ST_X(coords) as lat, ST_Y(coords) as lng,
    JSON_OBJECT('user_id', sssf_user.user_id, 'user_name', sssf_user.user_name) AS owner 
	  FROM sssf_cat 
	  JOIN sssf_user 
    ON sssf_cat.owner = sssf_user.user_id
    `
  );
  if (rows.length === 0) {
    throw new CustomError('No cats found', 404);
  }
  const cats: Cat[] = rows.map((row) => ({
    ...row,
    owner: JSON.parse(row.owner?.toString() || '{}'),
  }));

  return cats;
};

// TODO: create getCat function to get single cat
const getCat = async (catId: string): Promise<Cat> => {
  const [rows] = await promisePool.execute<GetCat[]>(
    `
    SELECT cat_id, cat_name, weight, filename, birthdate, ST_X(coords) as lat, ST_Y(coords) as lng,
    JSON_OBJECT('user_id', sssf_user.user_id, 'user_name', sssf_user.user_name) AS owner 
    FROM sssf_cat 
    JOIN sssf_user 
    ON sssf_cat.owner = sssf_user.user_id
    WHERE cat_id = ?
    `,
    [parseInt(catId)]
  );
  if (rows.length === 0) {
    throw new CustomError('No cats found', 400);
  }
  const cat: Cat = {
    ...rows[0],
    owner: JSON.parse(rows[0].owner?.toString() || '{}'),
  };
  return cat;
};

const addCat = async (data: PostCat): Promise<number> => {
  const [headers] = await promisePool.execute<ResultSetHeader>(
    `
    INSERT INTO sssf_cat (cat_name, weight, owner, filename, birthdate, coords) 
    VALUES (?, ?, ?, ?, ?, POINT(?, ?))
    `,
    [
      data.cat_name,
      data.weight,
      data.owner,
      data.filename,
      data.birthdate,
      data.lat,
      data.lng,
    ]
  );
  if (headers.affectedRows === 0) {
    throw new CustomError('No cats added', 400);
  }
  console.log(headers.info);
  return headers.insertId;
};

// TODO: create updateCat function to update single cat
// if role is admin, update any cat
// if role is user, update only cats owned by user
const updateCat = async (
  cat: PutCat,
  id: string,
  userId: number,
  role: string
): Promise<boolean> => {
  const catBeforeModified: Cat = await getCat(id);
  console.log(role === 'admin');

  if (
    role === 'admin' ||
    userId === (catBeforeModified.owner as User).user_id
  ) {
    const [headers] = await promisePool.execute<ResultSetHeader>(
      `
      UPDATE sssf_cat
      SET cat_name = ?
      WHERE cat_id = ?
      `,
      [cat.cat_name, id]
    );
    if (headers.affectedRows === 0) {
      throw new CustomError('No cats updated', 400);
    }
    return true;
  }

  throw new CustomError('Not authorized', 401);
};

const deleteCat = async (
  catId: number
  //userId: number,
  //role: string
): Promise<boolean> => {
  //if (role !== 'admin' || userId !== catId) {
  const [headers] = await promisePool.execute<ResultSetHeader>(
    `
      DELETE FROM sssf_cat 
      WHERE cat_id = ?;
      `,
    [catId]
  );
  if (headers.affectedRows === 0) {
    throw new CustomError('No cats deleted', 400);
  }
  return true;
  //}
  //throw new CustomError('Not authorized', 401);
};

export {getAllCats, getCat, addCat, updateCat, deleteCat};
