const express = require('express');
const bodyParser = require('body-parser');
const authenticate = require('../authenticate');
const cors = require('./cors');

const Favorites = require('../models/favorite');

const favoriteRouter = express.Router();

favoriteRouter.use(bodyParser.json());

favoriteRouter
  .route('/')
  .options(cors.corsWithOptions, (req, res) => {
    res.sendStatus(200);
  })
  .get(cors.cors, authenticate.verifyUser, (req, res, next) => {
    Favorites.find({ user: req.user._id })
      .populate('user')
      .populate('dishes')
      .then(
        favorites => {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.json(favorites);
        },
        err => next(err)
      )
      .catch(err => next(err));
  })
  .post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    Favorites.findOne({ user: req.user._id }).then(
      favorite => {
        if (favorite) {
          console.log(favorite.dishes);
          const dishes = favorite.dishes.concat(
            req.body.map(dishId => dishId._id)
          );
          Favorites.update(
            { _id: favorite._id },
            { $addToSet: { dishes: dishes } }
          )
            .then(
              () => {
                Favorites.findOne({ user: req.user._id }).then(
                  favorite => {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.json(favorite);
                  },
                  err => next(err)
                );
              },
              err => next(err)
            )
            .catch(err => next(err));
        } else {
          const Favorite = new Favorites({ user: req.user._id });
          Favorite.dishes = req.body.map(dishId => dishId._id);
          Favorite.save()
            .then(
              favorite => {
                Favorites.findById(favorite._id)
                  .populate('user')
                  .populate('dishes')
                  .then(favorites => {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.json(favorites);
                  });
              },
              err => next(err)
            )
            .catch(err => next(err));
        }
      },
      err => next(err)
    );
  })
  .put(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    res.statusCode = 403;
    res.end('PUT operation not supported on /favorites');
  })
  .delete(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    Favorites.remove({ user: req.user._id })
      .then(
        resp => {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.json(resp);
        },
        err => next(err)
      )
      .catch(err => next(err));
  });

favoriteRouter
  .route('/:dishId')
  .options(cors.corsWithOptions, (req, res) => {
    res.sendStatus(200);
  })
  .get(cors.cors, authenticate.verifyUser, (req, res, next) => {
    Favorites.findOne({ user: req.user._id }).then(favorites => {
      if (!favorites) {
        res.statusCode = 200;
        res.setHeader('Content-type', 'application/json');
        return res.json({ exists: false, favorites: favorites });
      } else {
        if (favorites.dishes.indexOf(req.params.dishId) < 0) {
          res.statusCode = 200;
          res.setHeader('Content-type', 'application/json');
          return res.json({ exists: false, favorites: favorites });
        } else {
          res.statusCode = 200;
          res.setHeader('Content-type', 'application/json');
          return res.json({ exists: true, favorites: favorites });
        }
      }
    });
  })
  .post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    Favorites.findOne({ user: req.user._id }).then(
      favorite => {
        if (favorite) {
          favorite.dishes.push(req.params.dishId);
          Favorites.update(
            { _id: favorite._id },
            { $addToSet: { dishes: favorite.dishes } }
          )
            .then(
              () => {
                Favorites.findOne({ user: req.user._id }).then(
                  favorite => {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.json(favorite);
                  },
                  err => next(err)
                );
              },
              err => next(err)
            )
            .catch(err => next(err));
        } else {
          const Favorite = new Favorites({
            user: req.user._id,
            dishes: [req.param.dishId]
          });
          Favorite.save()
            .then(
              favorite => {
                Favorites.findById(favorite._id)
                  .populate('user')
                  .populate('dishes')
                  .then(favorites => {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.json(favorites);
                  });
              },
              err => next(err)
            )
            .catch(err => next(err));
        }
      },
      err => next(err)
    );
  })
  .delete(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    Favorites.findOne({ user: req.user._id })
      .then(
        favorite => {
          if (favorite.dishes.indexOf(req.params.dishId) !== -1) {
            favorite.dishes.pop(favorite.dishes.indexOf(req.params.dishId));
            Favorites.updateOne(
              { _id: favorite._id },
              { $set: { dishes: favorite.dishes } }
            )
              .then(() => {
                Favorites.findById(favorite._id)
                  .populate('user')
                  .populate('dishes')
                  .then(favorite => {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.json(favorite);
                  });
              })
              .catch(err => next(err));
          }
        },
        err => next(err)
      )
      .catch(err => next(err));
  });

module.exports = favoriteRouter;
