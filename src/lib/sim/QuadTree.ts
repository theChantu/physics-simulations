import { K, EPS2 } from './constants';

import type { Particle } from './types';

class QuadTreeNode {
	boundary: { x: number; y: number; width: number; height: number };
	capacity: number;
	particles: Particle[];
	divided: boolean;
	northeast: QuadTreeNode | null;
	northwest: QuadTreeNode | null;
	southeast: QuadTreeNode | null;
	southwest: QuadTreeNode | null;
	charge: number;
	comX: number;
	comY: number;

	constructor(boundary: { x: number; y: number; width: number; height: number }, capacity: number) {
		this.boundary = boundary;
		this.capacity = capacity;
		this.particles = [];
		this.divided = false;
		this.northeast = null;
		this.northwest = null;
		this.southeast = null;
		this.southwest = null;
		this.charge = 0;
		this.comX = 0;
		this.comY = 0;
	}
	subdivide() {
		const { x, y, width, height } = this.boundary;
		const ne = { x: x + width / 2, y: y, width: width / 2, height: height / 2 };
		this.northeast = new QuadTreeNode(ne, this.capacity);
		const nw = { x: x, y: y, width: width / 2, height: height / 2 };
		this.northwest = new QuadTreeNode(nw, this.capacity);
		const se = { x: x + width / 2, y: y + height / 2, width: width / 2, height: height / 2 };
		this.southeast = new QuadTreeNode(se, this.capacity);
		const sw = { x: x, y: y + height / 2, width: width / 2, height: height / 2 };
		this.southwest = new QuadTreeNode(sw, this.capacity);

		if (this.particles.length > 0) {
			// Re-insert existing particles into the appropriate child nodes
			for (const p of this.particles) {
				this.northeast!.insert(p);
				this.northwest!.insert(p);
				this.southeast!.insert(p);
				this.southwest!.insert(p);
			}
			this.particles = [];
		}
		this.divided = true;
	}
	insert(particle: Particle): boolean {
		const { x, y, width, height } = this.boundary;
		if (particle.x < x || particle.x >= x + width || particle.y < y || particle.y >= y + height) {
			return false;
		}
		if (this.particles.length < this.capacity) {
			this.particles.push(particle);
			return true;
		}
		if (!this.divided) {
			this.subdivide();
		}

		// Recursively insert into the appropriate quadrant (this works because it will return false if the particle is out of bounds for that quadrant)
		return (
			this.northeast!.insert(particle) ||
			this.northwest!.insert(particle) ||
			this.southeast!.insert(particle) ||
			this.southwest!.insert(particle)
		);
	}
	query(
		range: { x: number; y: number; width: number; height: number },
		found: Particle[] = []
	): Particle[] {
		const { x, y, width, height } = this.boundary;
		if (
			range.x > x + width ||
			range.x + range.width < x ||
			range.y > y + height ||
			range.y + range.height < y
		) {
			return found;
		}
		for (const p of this.particles) {
			if (
				p.x >= range.x &&
				p.x < range.x + range.width &&
				p.y >= range.y &&
				p.y < range.y + range.height
			) {
				found.push(p);
			}
		}
		if (this.divided) {
			this.northeast!.query(range, found);
			this.northwest!.query(range, found);
			this.southeast!.query(range, found);
			this.southwest!.query(range, found);
		}
		return found;
	}
	calculateTotal() {
		this.charge = 0;
		let sumX = 0;
		let sumY = 0;

		// Sum particle charge in this specific node
		for (const p of this.particles) {
			this.charge += p.charge;
			sumX += p.x * p.charge;
			sumY += p.y * p.charge;
		}

		// Sum particle charge in children nodes
		if (this.divided) {
			const children = [this.northeast, this.northwest, this.southeast, this.southwest];
			for (const child of children) {
				if (!child) continue;
				child.calculateTotal();
				this.charge += child.charge;
				sumX += child.comX * child.charge;
				sumY += child.comY * child.charge;
			}
		}

		// Calculate Center of Mass for this node
		if (this.charge !== 0) {
			this.comX = sumX / this.charge;
			this.comY = sumY / this.charge;
		} else {
			// If empty box use geometric center
			this.comX = this.boundary.x + this.boundary.width / 2;
			this.comY = this.boundary.y + this.boundary.height / 2;
		}
	}
	containsPoint(particle: Particle): boolean {
		const { x, y, width, height } = this.boundary;
		return particle.x >= x && particle.x < x + width && particle.y >= y && particle.y < y + height;
	}
	calculateForceOn(particle: Particle, theta: number = 0.5): { fx: number; fy: number } {
		const dx = particle.x - this.comX;
		const dy = particle.y - this.comY;
		const distSq = dx * dx + dy * dy + EPS2;
		const dist = Math.sqrt(distSq);

		// Apply Barnes-Hut approximation
		if (this.divided && !this.containsPoint(particle) && this.boundary.width / dist < theta) {
			const force = (K * this.charge * particle.charge) / distSq;
			return {
				fx: force * (dx / dist),
				fy: force * (dy / dist)
			};
		} else {
			let fx = 0;
			let fy = 0;

			if (this.divided) {
				const children = [this.northeast, this.northwest, this.southeast, this.southwest];
				for (const child of children) {
					if (child) {
						const childForce = child.calculateForceOn(particle, theta);
						fx += childForce.fx;
						fy += childForce.fy;
					}
				}
			}

			for (const p of this.particles) {
				if (p === particle) continue;

				const pdx = particle.x - p.x;
				const pdy = particle.y - p.y;
				const pDistSq = pdx * pdx + pdy * pdy + EPS2;
				const pDist = Math.sqrt(pDistSq);

				if (pDist < 0.0001) continue;

				const pForce = (K * p.charge * particle.charge) / pDistSq;

				fx += pForce * (pdx / pDist);
				fy += pForce * (pdy / pDist);
			}

			return { fx, fy };
		}
	}
}
export default class QuadTree {
	root: QuadTreeNode;
	constructor(boundary: { x: number; y: number; width: number; height: number }, capacity: number) {
		this.root = new QuadTreeNode(boundary, capacity);
	}
	insert(particle: Particle): boolean {
		return this.root.insert(particle);
	}
	query(range: { x: number; y: number; width: number; height: number }): Particle[] {
		return this.root.query(range);
	}
}
