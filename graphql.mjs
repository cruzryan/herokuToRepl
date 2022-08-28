import { lightfetch } from 'lightfetch-node';
import Conf from 'conf';
const config = new Conf();

export const graphql = async (query, variables = {}) => {
	const data = await lightfetch(
		'https://replit.com/graphql',
		{
			method: 'POST',
			headers: {
				'X-Requested-With': 'XMLHttpRequest',
				'Referrer': 'https://replit.com',
				'User-Agent': 'Mozilla/5.0',
				'Cookie': 'connect.sid=' + config.get('login'),
			},
			body: {
				query,
				variables,
			},
	}).then(val => {
        return val.toJSON();
    });
	return data;
}