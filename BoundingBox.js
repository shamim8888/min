/* 
* This file is part of min.
* 
* min is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* min is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
* 
* You should have received a copy of the GNU General Public License
* along with min.  If not, see <http://www.gnu.org/licenses/>.
* 
* Copyright (C) 2011-2014 Richard Pospesel, Kevin Hart, Lei Hu, Siyu Zhu, David Stalnaker,
* Christopher Sasarak, Robert LiVolsi, Awelemdy Orakwue, and Richard Zanibbi
* (Document and Pattern Recognition Lab, RIT) 
*/
/*
	This file defines an object which represents the bounding box which surrounds objects
    on the canvas when they are clicked or selected.

    Methods:
		translate - translates the bounding box on the screen by a given offset.
		edge_clicked - determine which edge of the box was clicked based on a given point.
*/
function BoundingBox(corner_a, corner_b, render_corner_a, render_corner_b)
{
    // set up logical mins for resizing
    this.mins = new Vector2(0,0);
    this.maxs = new Vector2(0,0);
    if(corner_a.x < corner_b.x)
    {
        this.mins.x = corner_a.x;
        this.maxs.x = corner_b.x;
    }
    else
    {
        this.mins.x = corner_b.x;
        this.maxs.x = corner_a.x;
    }
    
    if(corner_a.y < corner_b.y)
    {
        this.mins.y = corner_a.y;
        this.maxs.y = corner_b.y;
    }
    else
    {
        this.mins.y = corner_b.y;
        this.maxs.y = corner_a.y;
    }
    
    // set up rendering mins
    
    this.render_mins = new Vector2(0,0);
    this.render_maxs = new Vector2(0,0);
    
    if(render_corner_a.x < render_corner_b.x)
    {
        this.render_mins.x = render_corner_a.x;
        this.render_maxs.x = render_corner_b.x;
    }
    else
    {
        this.render_mins.x = render_corner_b.x;
        this.render_maxs.x = render_corner_a.x;
    }
    
    if(render_corner_a.y < render_corner_b.y)
    {
        this.render_mins.y = render_corner_a.y;
        this.render_maxs.y = render_corner_b.y;
    }
    else
    {
        this.render_mins.y = render_corner_b.y;
        this.render_maxs.y = render_corner_a.y;
    }
}

BoundingBox.prototype.clone = function()
{
    return new BoundingBox(this.mins, this.maxs, this.render_mins, this.render_maxs);
}

BoundingBox.prototype.point_collides = function(in_point)
{
    if(in_point.x < this.render_mins.x)
        return false;
    if(in_point.x > this.render_maxs.x)
        return false;
    if(in_point.y < this.render_mins.y)
        return false;
    if(in_point.y > this.render_maxs.y)
        return false;
    return true;
}

BoundingBox.prototype.translate = function(in_offset)
{
    this.mins.Add(in_offset);
    this.maxs.Add(in_offset);
    
    this.render_mins.Add(in_offset);
    this.render_maxs.Add(in_offset);
}

BoundingBox.prototype.edge_clicked = function(in_point)
{
    var distance = Editor.control_point_radius + Editor.control_point_line_width/2.0;
    var distance2 = distance*distance;

    // top edge
    if(Vector2.SquareDistance(in_point, new Vector2( (this.render_mins.x + this.render_maxs.x)/2.0, this.render_mins.y)) <= distance2)
        return 0;
    // top right corner
    if(Vector2.SquareDistance(in_point, new Vector2(this.render_maxs.x, this.render_mins.y)) <= distance2)
        return 1;
    // right edge
    if(Vector2.SquareDistance(in_point, new Vector2(this.render_maxs.x, (this.render_mins.y + this.render_maxs.y)/2.0)) <= distance2)
        return 2;
    // botom right corner
    if(Vector2.SquareDistance(in_point, this.render_maxs) <= distance2)
        return 3;
    // bottom edge
    if(Vector2.SquareDistance(in_point, new Vector2( (this.render_mins.x + this.render_maxs.x)/2.0, this.render_maxs.y)) <= distance2)
        return 4;
    // bottom left corner
    if(Vector2.SquareDistance(in_point, new Vector2(this.render_mins.x, this.render_maxs.y)) <= distance2)
        return 5;
    //  left edge
    if(Vector2.SquareDistance(in_point, new Vector2(this.render_mins.x, (this.render_mins.y + this.render_maxs.y)/2.0)) <= distance2)
        return 6;
    // top left corner
    if(Vector2.SquareDistance(in_point, this.render_mins) <= distance2)
        return 7;
    
    return -1;
}

point_line_segment_distance = function(A, B, C)
{
    var AB = Vector2.Subtract(B, A);
    var t = Vector2.Dot(Vector2.Subtract(C, A), AB) / Vector2.Dot(AB, AB);

    if(t > 1)
        t = 1;
    if(t < 0)
        t = 0;
    
    var D = Vector2.Add(A, Vector2.Multiply(t, AB));
    
    var result = Vector2.Distance(D, C);
    
    return result;
}