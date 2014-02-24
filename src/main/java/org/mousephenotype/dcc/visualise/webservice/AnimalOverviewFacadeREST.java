/*
 * Copyright 2013 Medical Research Council Harwell.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.mousephenotype.dcc.visualise.webservice;

import java.util.ArrayList;
import javax.ejb.Stateless;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import org.mousephenotype.dcc.entities.overviews.AnimalOverview;

/**
 * Web service for retrieving specimen details.
 * 
 * @author Gagarine Yaikhom <g.yaikhom@har.mrc.ac.uk>
 */
@Stateless
@Path("specimens")
public class AnimalOverviewFacadeREST extends AbstractFacade<AnimalOverview> {

    public AnimalOverviewFacadeREST() {
        super(AnimalOverview.class);
    }

    @GET
    @Path("{id}")
    @Produces(MediaType.APPLICATION_JSON)
    public AnimalOverviewPack extjsFind(
            @PathParam("id") Long id) {
        AnimalOverviewPack p = new AnimalOverviewPack();
        ArrayList<AnimalOverview> t = new ArrayList<>();
        t.add(super.find(id));
        p.setDataSet(t);
        return p;
    }

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public AnimalOverviewPack extjsFindAll() {
        AnimalOverviewPack p = new AnimalOverviewPack();
        p.setDataSet(super.findAll());
        return p;
    }
}
