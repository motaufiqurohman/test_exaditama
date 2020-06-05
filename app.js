const express = require("express");
const app = express();
const Sequelize = require("sequelize");
require('dotenv').config()
const {
  PORT,
  DB_HOST,
  DB_USERNAME,
  DB_PASSWORD,
  DB_NAME
} = process.env
const sequelize = new Sequelize(
  `postgres://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}`
);
const port = PORT;
sequelize
  .authenticate()
  .then(() => {
    console.log("Connection has been established successfully.");
  })
  .catch((err) => {
    console.error("Unable to connect to the database:", err);
  });
const Model = Sequelize.Model;
class Club extends Model {}
Club.init({
  club_name: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  points: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
}, {
  sequelize,
  modelName: "Club",
  freezeTableName: true,
  tableName: "club_table",
});
Club.sync({
  force: true
}).then(() => {
  var data = [{
      club_name: "Man Utd",
      points: 0,
    },
    {
      club_name: "Liverpool",
      points: 0,
    },
    {
      club_name: "Chelsea",
      points: 0,
    },
  ];
  Club.bulkCreate(data, {
    returning: true
  });
});
app.use(express.json());
app.post("/football/recordgame", (req, res) => {
  var {
    clubhomename,
    clubawayname,
    score
  } = req.body;
  var arrScore = score.split(":");
  if (arrScore[0] > arrScore[1]) {
    updatePoints(clubhomename, 3);
  } else if (arrScore[0] < arrScore[1]) {
    updatePoints(clubawayname, 3);
  } else if (arrScore[0] == arrScore[1]) {
    updatePoints(clubhomename, 1);
    updatePoints(clubawayname, 1);
  }
  res.json({
    success: true,
  });
});

app.get("/football/leaguestanding", async (req, res) => {
  var data = await Club.findAll({
    attributes: ["club_name", "points"],
    order: [
      ["points", "DESC"]
    ],
  });
  res.json({
    success: data,
  });
});

app.get("/football/rank", async (req, res) => {
  var clubname = req.query.clubname;
  var data = await sequelize.query(`
    select
      *
    from
      (
      select
        row_number() over() as standings,
        tbl.club_name
      from
        (
        select
          club_name,
          points
        from
          club_table
        order by
          points desc) tbl)tbl2
    where
      tbl2.club_name = '${clubname}'
    limit 1`);
  res.json({
    data: data[0][0],
  });
});

app.listen(PORT, () => console.log("running on port:" + PORT));

async function updatePoints(clubName, points) {
  try {
    var club = await Club.findOne({
      attributes: ["points"],
      where: {
        club_name: clubName,
      },
    });
  } catch (err) {
    console.error(err);
  }

  try {
    Club.update({
      points: club.dataValues.points + points,
    }, {
      where: {
        club_name: clubName,
      },
    });
  } catch (err) {
    console.error(err);
  }
}