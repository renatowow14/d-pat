module.exports = function (app) {

	var Internal = {}
	var Query = {};

	Query.defaultParams = {
		'year': 2017,
		'amount': 1
	}

	Internal.regionFilter = function (type, region) {

		if (type == 'city')
			return " AND county = ${region}"
		else if (type == 'state')
			return " AND uf = ${region}"
		else
			return ''
	}

	Query.periods = function () {
		return "SELECT DISTINCT classname FROM prodes_cerrado ORDER BY classname DESC";
	}

	Query.indicators = function (params) {

		var type = params['type']
		var region = params['region']
		var year = params['year']


		return [
			// {
			// 	id: 'desmat_per_region',
			// 	sql: " SELECT classname, source, SUM(areamunkm) as areamunkm " +
			// 		" FROM prodes_cerrado " +
			// 		" WHERE classname != 'AGUA' " + Internal.regionFilter(type) +
			// 		" GROUP BY 1,2 " +
			// 		" ORDER BY classname ASC;"
			// },
			{
				id: 'uso_solo_terraclass',
				sql: "select r.text as region, r.area_km2 as area_region, lc.classe_lulc, total_area_classe_lulc, desmat_area_classe_lulc, lc.color, lc.year from prodes_regions_lulc lc inner join regions r on "
				+ "(r.gid = lc.region_id) where lc.fonte = 'terraclass' and lc.type = '" + type + "' AND unaccent(r.value) ilike unaccent('" + region + "') and lc.year = " + year + " ORDER BY 5 DESC;"

			},
			{
				id: 'uso_solo_probio',
				sql: "select 1 from graphic_colors limit 1"

			},
			{
				id: 'uso_solo_mapbiomas',
				sql: "select 1 from graphic_colors limit 1"

			},
			{
				id: 'uso_solo_agrosatelite',
				sql: "select r.text as region, r.area_km2 as area_region, lc.classe_lulc, total_area_classe_lulc, desmat_area_classe_lulc, lc.color, lc.year from prodes_regions_lulc lc inner join regions r on "
				+ "(r.gid = lc.region_id) where lc.fonte = 'agrosatelite' and lc.type = '" + type + "' AND unaccent(r.value) ilike unaccent('" + region + "') and lc.year = " + year + " ORDER BY 5 DESC;"

			},
			// {
			// 	id: 'lulc_mapbiomas',
			// 	sql: "select fonte, classe, sum(proporcao) as proporcao from prodes_cerrado p inner join prodes_cerrado_lulc lc on prodes_id = p.gid where fonte = TerraClass-Cerrado" +
			// 		Internal.regionFilter(type, region) + " group by 1,2"
			// }


		]
	}

	Query.timeseries = function (params) {

		var type = params['type']
		var region = params['region']

		return [{
				id: 'timeseries',
				sql: " SELECT year, 'prodes_cerrado' source, SUM(areamunkm) as areamunkm " +
					" FROM prodes_cerrado " +
					" WHERE year IS NOT NULL " + Internal.regionFilter(type) +
					" GROUP BY 1;"
			},
			{
				id: 'extent',
				sql: "SELECT area_km2 as areaRegion, text as name FROM regions WHERE type=${type} AND value=${region}"
			}
		]
	}

	Query.states = function () {
		return " SELECT UPPER(uf) AS region, 'prodes_cerrado' source, SUM(areamunkm) as areamunkm " +
			" FROM prodes_cerrado " +
			" WHERE year = ${year} " +
			" GROUP BY 1,2 " +
			" ORDER BY 3 DESC;";
	}

	Query.cities = function (params) {

		var year = params['year']
		var type = params['type']

		return " SELECT county AS name, UPPER(uf) as uf," +
			(Number(year) < 2013 ? "SUM(areamunkm)/2" : "SUM(areamunkm)") + " as value " +
			" FROM prodes_cerrado " +
			" WHERE year = ${year} AND areamunkm > 0" +
			Internal.regionFilter(type) +
			" GROUP BY 1,2 " +
			" ORDER BY 3 DESC" +
			" LIMIT 10;";
	}

	Query.largest = function (params) {
		return "SELECT view_date,county,uf, ST_ASGEOJSON(geom) FROM prodes_cerrado WHERE year = ${year} ORDER BY areamunkm DESC LIMIT ${amount}"
	};

	Query.illegal = function (params) {

		var year = params['year']
		var type = params['type']

		return [{
				id: 'app',
				sql: "SELECT * from desmat_on_APP where year = " + year + Internal.regionFilter(type) + " LIMIT 10;"
			},
			{
				id: 'rl',
				sql: "SELECT * from desmat_on_RL where year = " + year + Internal.regionFilter(type) + " LIMIT 10;"
			}
		]
	};

	Query.modis = function (params) {

		var gid = params['gid']
		var table = params['table']


		return [{
			id: 'centroid',
			sql: "SELECT gid, st_y(ST_PointOnSurface(geom)) as lat, st_x(ST_PointOnSurface(geom)) as long from " + table + "_cerrado where gid = " + gid + ";"
		}]
	};


	return Query;

};